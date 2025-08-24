import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

@Entity('abstract_sale', { schema: 'dp6_quipu_prod' })
export class AbstractSale {
  @PrimaryGeneratedColumn()
  id?: number

  @Column({ name: 'sale_id' })
  saleId: number

  @Column({ name: 'acl_id' })
  aclId: number
  
  // @Column({ name: 'company_id' })
  // companyId: number

  @Column({ name: 'amount' })
  amount: number

  @Column({ name: 'type' })
  type: number

  @Column({ name: 'emitted_at' })
  emittedAt: number

  @Column({ name: 'state' })
  state: number

  @Column({ name: 'created_at' })
  createdAt?: number|null

}